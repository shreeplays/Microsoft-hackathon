// Define the class
class Book {
    // Constructor: Runs when a new object is created
    constructor(title, author, price) {
        this.title = title;
        this.author = author;
        this.price = price;
    }

    // Method to display book details
    displayInfo() {
        console.log(`Title: ${this.title}`);
        console.log(`Author: ${this.author}`);
        console.log(`Price: $${this.price}`);
        console.log('-----------------------');
    }
}

// Creating objects (instances) of the Book class
const book1 = new Book("The Great Gatsby", "F. Scott Fitzgerald", 10.99);
const book2 = new Book("1984", "George Orwell", 8.50);

console.log("--- Library Records ---");

// Calling methods on the objects
book1.displayInfo();
book2.displayInfo();