using System;
using System.Collections.Generic;

class Program
{
    static void Main(string[] args)
    {
        List<string> studentRecords = new List<string>();
        int count = 0;

        Console.WriteLine("--- Student Record System ---");
        Console.WriteLine("Type 'exit' to finish.");

        // The 'while' loop handles the continuous entry
        while (true)
        {
            Console.Write("\nEnter student name: ");
            string name = Console.ReadLine();

            // Condition to break the loop
            if (name.ToLower() == "exit")
            {
                break;
            }

            Console.Write("Enter score (0-100): ");
            int score = int.Parse(Console.ReadLine());

            Console.Write("Enter attendance %: ");
            int attendance = int.Parse(Console.ReadLine());

            // Conditional logic for grading
            string grade;
            if (score >= 90) grade = "A";
            else if (score >= 80) grade = "B";
            else if (score >= 70) grade = "C";
            else grade = "F";

            // Logic for status
            string status = "Passing";
            if (grade == "F" || attendance < 75)
            {
                status = "At Risk";
            }

            // Storing data in a list using string interpolation ($"")
            studentRecords.Add($"Student: {name} | Grade: {grade} | Status: {status}");
            count++;
        }

        // Final Report using a 'foreach' loop
        Console.WriteLine("\n==============================");
        Console.WriteLine($"FINAL REPORT: {count} Students");
        Console.WriteLine("==============================");

        foreach (string record in studentRecords)
        {
            Console.WriteLine(record);
        }

        Console.WriteLine("==============================");
    }
}