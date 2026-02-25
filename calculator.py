import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QGridLayout, QLineEdit, QPushButton
from PyQt5.QtCore import Qt

class Calculator(QWidget):
    """
    A simple desktop calculator application built using PyQt5.
    Provides basic arithmetic operations, decimal support, and clear/delete functionality.
    """
    def __init__(self):
        super().__init__()
        # Set window properties
        self.setWindowTitle("PyQt5 Calculator")
        self.setFixedSize(300, 420)
        
        # Initialize the User Interface
        self.initUI()

    def initUI(self):
        # Main Vertical Layout
        self.layout = QVBoxLayout()

        # Display Screen (QLineEdit)
        # Read-only to prevent keyboard input, right-aligned for calculator standard
        self.display = QLineEdit()
        self.display.setFixedHeight(50)
        self.display.setAlignment(Qt.AlignRight)
        self.display.setReadOnly(True)
        self.display.setStyleSheet("font-size: 24px; padding: 5px;")
        self.layout.addWidget(self.display)

        # Grid Layout for buttons
        self.grid = QGridLayout()
        
        # Button labels organized by rows
        buttons = [
            ['7', '8', '9', '/'],
            ['4', '5', '6', '*'],
            ['1', '2', '3', '-'],
            ['C', '0', '=', '+'],
            ['DEL', '.']
        ]

        # Populate the grid with buttons
        for r, row in enumerate(buttons):
            for c, label in enumerate(row):
                btn = QPushButton(label)
                btn.setFixedSize(60, 60)
                btn.setStyleSheet("font-size: 18px;")
                # Connect the button's clicked signal to the logic handler
                btn.clicked.connect(self.on_click)
                self.grid.addWidget(btn, r, c)

        # Add the grid to the main layout and set the window layout
        self.layout.addLayout(self.grid)
        self.setLayout(self.layout)

    def on_click(self):
        """
        Handles button click events with robust error checking.
        """
        sender = self.sender().text()
        current_expression = self.display.text()

        # 1. Handle Clear operation
        if sender == 'C':
            self.display.clear()
            return

        # 2. Handle Delete operation
        if sender == 'DEL':
            if current_expression == "Error":
                self.display.clear()
            else:
                self.display.setText(current_expression[:-1])
            return

        # 3. Handle Equals operation
        if sender == '=':
            if not current_expression or current_expression == "Error":
                return
            try:
                # eval() handles basic arithmetic string evaluation
                # Note: In a production environment with user-writable input, 
                # a custom parser should be used instead of eval() for security.
                result = eval(current_expression)
                self.display.setText(str(result))
            except ZeroDivisionError:
                self.display.setText("Error")
            except Exception:
                self.display.setText("Error")
            return

        # 4. Handle input (Numbers and Operators)
        # If the display currently shows "Error", reset it for the new input
        if current_expression == "Error":
            self.display.setText(sender)
        else:
            self.display.setText(current_expression + sender)

if __name__ == "__main__":
    # Create the application instance
    app = QApplication(sys.argv)
    
    # Instantiate and show the calculator window
    window = Calculator()
    window.show()
    
    # Execute the application loop
    sys.exit(app.exec_())
