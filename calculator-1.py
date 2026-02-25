import sys
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QGridLayout,
    QPushButton, QLineEdit, QVBoxLayout
)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

class CalculatorLogic:
    def __init__(self):
        self.reset()

    def reset(self):
        self.current_display = "0"
        self.first_operand = None
        self.operator = None
        self.waiting_for_operand = False

    def input_digit(self, digit):
        if self.waiting_for_operand:
            self.current_display = digit
            self.waiting_for_operand = False
        else:
            if self.current_display == "0":
                self.current_display = digit
            else:
                self.current_display += digit

    def input_decimal(self):
        if self.waiting_for_operand:
            self.current_display = "0."
            self.waiting_for_operand = False
        elif "." not in self.current_display:
            self.current_display += "."

    def set_operator(self, op):
        if self.first_operand is None:
            self.first_operand = float(self.current_display)
        elif not self.waiting_for_operand:
            result = self.perform_calculation()
            if result == "Error":
                return "Error"
            self.first_operand = result
            self.current_display = str(self.first_operand)

        self.operator = op
        self.waiting_for_operand = True
        return None

    def perform_calculation(self):
        if self.operator and self.first_operand is not None:
            try:
                second_operand = float(self.current_display)
                if self.operator == "+":
                    result = self.first_operand + second_operand
                elif self.operator == "-":
                    result = self.first_operand - second_operand
                elif self.operator == "*":
                    result = self.first_operand * second_operand
                elif self.operator == "/":
                    if second_operand == 0:
                        raise ZeroDivisionError("Cannot divide by zero")
                    result = self.first_operand / second_operand

                # Format the result to avoid scientific notation for small numbers
                if isinstance(result, float) and result.is_integer():
                    return int(result)
                else:
                    return round(result, 10)

            except ZeroDivisionError:
                return "Error"
            except OverflowError:
                return "Error"
        return float(self.current_display)

    def calculate_result(self):
        if self.operator and self.first_operand is not None:
            result = self.perform_calculation()
            if result == "Error":
                self.reset()
                return "Error"
            self.reset()
            self.current_display = str(result)
            return result
        return float(self.current_display)

class CalculatorUI(QWidget):
    def __init__(self, logic):
        super().__init__()
        self.logic = logic
        self.init_ui()

    def init_ui(self):
        # Main layout
        main_layout = QVBoxLayout()

        # Display
        self.display = QLineEdit()
        self.display.setReadOnly(True)
        self.display.setAlignment(Qt.AlignRight)
        self.display.setMaxLength(15)
        self.display.setFont(QFont("Arial", 20))
        self.display.setText("0")
        self.display.setStyleSheet(
            "QLineEdit {"
            "   background-color: #f0f0f0;"
            "   padding: 10px;"
            "   border: 2px solid #333;"
            "}"
        )

        # Button layout
        button_grid = QGridLayout()
        button_grid.setSpacing(5)

        # Create buttons
        buttons = [
            ('C', 0, 0), ('⌫', 0, 1), ('/', 0, 2), ('*', 0, 3),
            ('7', 1, 0), ('8', 1, 1), ('9', 1, 2), ('-', 1, 3),
            ('4', 2, 0), ('5', 2, 1), ('6', 2, 2), ('+', 2, 3),
            ('1', 3, 0), ('2', 3, 1), ('3', 3, 2), ('=', 3, 3),
            ('0', 4, 0), ('.', 4, 1)
        ]

        self.button_widgets = {}

        # Add buttons to grid
        for (text, row, col) in buttons:
            button = QPushButton(text)
            button.setFont(QFont("Arial", 18))
            button.setStyleSheet(
                "QPushButton {"
                "   background-color: #e0e0e0;"
                "   border: 1px solid #888;"
                "   padding: 15px;"
                "}"
                "QPushButton:hover {"
                "   background-color: #d0d0d0;"
                "}"
                "QPushButton:pressed {"
                "   background-color: #b0b0b0;"
                "}"
            )

            # Span '0' button across two columns
            if text == '0':
                button_grid.addWidget(button, row, col, 1, 2)
            elif text == '=':
                button_grid.addWidget(button, row, col, 2, 1)  # Span 2 rows
            else:
                button_grid.addWidget(button, row, col)

            self.button_widgets[text] = button

        # Special styling for operator buttons
        operator_buttons = ['+', '-', '*', '/', '=']
        for op in operator_buttons:
            self.button_widgets[op].setStyleSheet(
                "QPushButton {"
                "   background-color: #f0a030;"
                "   border: 1px solid #888;"
                "   padding: 15px;"
                "}"
                "QPushButton:hover {"
                "   background-color: #e09020;"
                "}"
                "QPushButton:pressed {"
                "   background-color: #d08010;"
                "}"
            )

        # Special styling for clear buttons
        self.button_widgets['C'].setStyleSheet(
            "QPushButton {"
            "   background-color: #ff6666;"
            "   border: 1px solid #888;"
            "   padding: 15px;"
            "}"
            "QPushButton:hover {"
            "   background-color: #ff4444;"
            "}"
            "QPushButton:pressed {"
            "   background-color: #cc3333;"
            "}"
        )

        # Add widgets to main layout
        main_layout.addWidget(self.display)
        main_layout.addLayout(button_grid)

        self.setLayout(main_layout)

class CalculatorApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.logic = CalculatorLogic()
        self.ui = CalculatorUI(self.logic)
        self.setCentralWidget(self.ui)
        self.setWindowTitle("Simple Calculator")
        self.setMinimumSize(300, 400)
        self.setup_connections()
        self.apply_styles()

    def setup_connections(self):
        # Fix lambda closure bug by using default parameter to capture value
        for i in range(10):
            self.ui.button_widgets[str(i)].clicked.connect(
                lambda checked, x=str(i): self.input_digit(x)
            )

        # Connect operator buttons with same fix
        for op in ['+', '-', '*', '/']:
            self.ui.button_widgets[op].clicked.connect(
                lambda checked, x=op: self.set_operator(x)
            )

        # Connect special buttons
        self.ui.button_widgets['C'].clicked.connect(self.clear)
        self.ui.button_widgets['='].clicked.connect(self.calculate)
        self.ui.button_widgets['.'].clicked.connect(self.input_decimal)
        self.ui.button_widgets['⌫'].clicked.connect(self.backspace)

    def apply_styles(self):
        self.setStyleSheet("background-color: #f5f5f5;")

    def input_digit(self, digit):
        self.logic.input_digit(digit)
        self.update_display()

    def input_decimal(self):
        self.logic.input_decimal()
        self.update_display()

    def set_operator(self, operator):
        result = self.logic.set_operator(operator)
        if result == "Error":
            self.logic.current_display = "Error"
            self.update_display()
            self.logic.reset()
        else:
            self.update_display()

    def calculate(self):
        result = self.logic.calculate_result()
        if result == "Error":
            self.logic.current_display = "Error"
            self.update_display()
            self.logic.reset()
        else:
            self.update_display()

    def clear(self):
        self.logic.reset()
        self.update_display()

    def backspace(self):
        if not self.logic.waiting_for_operand:
            if len(self.logic.current_display) > 1:
                self.logic.current_display = self.logic.current_display[:-1]
            else:
                self.logic.current_display = "0"
            self.update_display()

    def update_display(self):
        # Handle error display
        if self.logic.current_display == "Error":
            self.ui.display.setText("Error")
        else:
            # Format display to avoid scientific notation
            try:
                value = float(self.logic.current_display)
                if value.is_integer():
                    self.ui.display.setText(str(int(value)))
                else:
                    # Limit decimal places for display
                    self.ui.display.setText(f"{value:.10f}".rstrip('0').rstrip('.'))
            except ValueError:
                self.ui.display.setText(self.logic.current_display)

def main():
    app = QApplication(sys.argv)
    calculator = CalculatorApp()
    calculator.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
