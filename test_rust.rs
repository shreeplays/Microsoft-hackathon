use std::io::{self, Write};

fn main() {
    let mut student_records = Vec::new();
    let mut count = 0;

    println!("--- Student Record System ---");
    println!("Type 'exit' to finish.");

    // The 'loop' keyword is a cleaner way to write 'while true' in Rust
    loop {
        print!("\nEnter student name: ");
        io::stdout().flush().unwrap(); // Ensures the prompt appears before input
        
        let mut name = String::new();
        io::stdin().read_line(&mut name).expect("Failed to read line");
        let name = name.trim();

        // Condition to break the loop
        if name.to_lowercase() == "exit" {
            break;
        }

        print!("Enter score (0-100): ");
        io::stdout().flush().unwrap();
        let mut score_input = String::new();
        io::stdin().read_line(&mut score_input).expect("Failed to read line");
        let score: i32 = score_input.trim().parse().unwrap_or(0);

        print!("Enter attendance %: ");
        io::stdout().flush().unwrap();
        let mut attendance_input = String::new();
        io::stdin().read_line(&mut attendance_input).expect("Failed to read line");
        let attendance: i32 = attendance_input.trim().parse().unwrap_or(0);

        // Conditional logic for grading
        let grade = if score >= 90 {
            "A"
        } else if score >= 80 {
            "B"
        } else if score >= 70 {
            "C"
        } else {
            "F"
        };

        // Logic for status
        let mut status = "Passing";
        if grade == "F" || attendance < 75 {
            status = "At Risk";
        }

        // Storing data in a formatted String
        let record = format!("Student: {} | Grade: {} | Status: {}", name, grade, status);
        student_records.push(record);
        count += 1;
    }

    // Final Report using a 'for' loop
    println!("\n==============================");
    println!("FINAL REPORT: {} Students", count);
    println!("==============================");

    for record in &student_records {
        println!("{}", record);
    }

    println!("==============================");
}