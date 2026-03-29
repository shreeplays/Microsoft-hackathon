import java.util.Scanner;
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        ArrayList<String> studentRecords = new ArrayList<>();
        int count = 0;

        System.out.println("--- Student Record System ---");
        System.out.println("Type 'exit' to finish.");

        // The 'while' loop keeps the program running
        while (true) {
            System.out.print("\nEnter student name: ");
            String name = scanner.nextLine();

            // Condition to break the loop
            if (name.equalsIgnoreCase("exit")) {
                break;
            }

            System.out.print("Enter score (0-100): ");
            int score = Integer.parseInt(scanner.nextLine());

            System.out.print("Enter attendance %: ");
            int attendance = Integer.parseInt(scanner.nextLine());

            // Conditional logic for grading
            String grade;
            if (score >= 90) {
                grade = "A";
            } else if (score >= 80) {
                grade = "B";
            } else if (score >= 70) {
                grade = "C";
            } else {
                grade = "F";
            }

            // Logic for status
            String status = "Passing";
            if (grade.equals("F") || attendance < 75) {
                status = "At Risk";
            }

            // Storing as a simple formatted string
            studentRecords.add(name + " | Grade: " + grade + " | Status: " + status);
            count++;
        }

        // Final Report using a 'for' loop
        System.out.println("\n==============================");
        System.out.println("FINAL REPORT: " + count + " Students");
        System.out.println("==============================");

        for (int i = 0; i < studentRecords.size(); i++) {
            System.out.println(studentRecords.get(i));
        }

        System.out.println("==============================");
        scanner.close();
    }
}