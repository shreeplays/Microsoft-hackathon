import sys

# --- Global Data Store ---
library_books = [
    {"id": 101, "title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "available": True},
    {"id": 102, "title": "1984", "author": "George Orwell", "available": False},
    {"id": 103, "title": "The Hobbit", "author": "J.R.R. Tolkien", "available": True},
]

# --- 1. Utility Functions ---

def clear_screen():
    """Prints whitespace to simulate clearing the console."""
    print("\n" * 50)

def display_header(title):
    """Prints a formatted header for the UI."""
    print("=" * 40)
    print(f"{title.upper():^40}")
    print("=" * 40)

def get_valid_input(prompt, expected_type=str):
    """Ensures the user provides the correct data type."""
    while True:
        user_input = input(prompt)
        try:
            return expected_type(user_input)
        except ValueError:
            print(f"Invalid input. Please enter a {expected_type.__name__}.")

# --- 2. Core Logic Functions ---

def list_all_books():
    """Iterates through the library and displays details."""
    display_header("Current Inventory")
    print(f"{'ID':<5} | {'Title':<20} | {'Author':<15} | {'Status'}")
    print("-" * 60)
    for book in library_books:
        status = "Available" if book["available"] else "Checked Out"
        print(f"{book['id']:<5} | {book['title']:<20} | {book['author']:<15} | {status}")
    input("\nPress Enter to return to menu...")

def find_book_by_id(book_id):
    """Helper function to locate a book object by its ID."""
    for book in library_books:
        if book["id"] == book_id:
            return book
    return None

def add_new_book():
    """Collects info and appends a new dictionary to the list."""
    display_header("Add New Book")
    new_id = get_valid_input("Enter Book ID (Numeric): ", int)
    
    if find_book_by_id(new_id):
        print("Error: A book with this ID already exists.")
    else:
        title = input("Enter Title: ")
        author = input("Enter Author: ")
        library_books.append({
            "id": new_id,
            "title": title,
            "author": author,
            "available": True
        })
        print(f"Successfully added '{title}'!")
    input("\nPress Enter to continue...")

def toggle_checkout_status():
    """Changes the availability of a book."""
    display_header("Check-out / Return")
    book_id = get_valid_input("Enter Book ID: ", int)
    book = find_book_by_id(book_id)

    if book:
        book["available"] = not book["available"]
        status_text = "Returned" if book["available"] else "Checked Out"
        print(f"Update Successful! '{book['title']}' is now {status_text}.")
    else:
        print("Book not found.")
    input("\nPress Enter to continue...")

# --- 3. The Main Controller ---

def main_menu():
    """The central hub that directs user flow."""
    while True:
        clear_screen()
        display_header("Digital Library System")
        print("1. View All Books")
        print("2. Add a New Book")
        print("3. Check-out/Return a Book")
        print("4. Exit")
        
        choice = input("\nSelect an option (1-4): ")

        if choice == '1':
            list_all_books()
        elif choice == '2':
            add_new_book()
        elif choice == '3':
            toggle_checkout_status()
        elif choice == '4':
            print("Goodbye!")
            sys.exit()
        else:
            print("Invalid selection. Try again.")

# --- Entry Point ---
if __name__ == "__main__":
    # This ensures the script only runs if executed directly
    main_menu()