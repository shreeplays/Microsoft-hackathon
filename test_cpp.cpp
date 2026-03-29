#include <iostream>
#include <string>

using namespace std;

class BankAccount {
private:
    // Private data: Cannot be accessed directly from outside the class
    string owner;
    double balance;

public:
    // Constructor
    BankAccount(string name, double initialDeposit) {
        owner = name;
        balance = initialDeposit;
    }

    // Method to add money
    void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
            cout << "Deposited: $" << amount << endl;
        }
    }

    // Method to withdraw money with a safety check
    void withdraw(double amount) {
        if (amount > 0 && amount <= balance) {
            balance -= amount;
            cout << "Withdrew: $" << amount << endl;
        } else {
            cout << "Invalid withdrawal amount or insufficient funds!" << endl;
        }
    }

    // Method to view account details
    void displayBalance() {
        cout << "Account Owner: " << owner << endl;
        cout << "Current Balance: $" << balance << endl;
        cout << "-----------------------" << endl;
    }
};

int main() {
    // Create an object of the BankAccount class
    BankAccount myAccount("Hussain", 500.00);

    // Perform operations
    myAccount.displayBalance();
    myAccount.deposit(150.0);
    myAccount.withdraw(100.0);
    myAccount.displayBalance();

    return 0;
}