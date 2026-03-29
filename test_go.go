package main

import "fmt"

func processNumber(n int) int {
	if n % 2 == 0 {
		fmt.Println("Even number")
		return n * 2
	} else {
		fmt.Println("Odd number")
		return n + 1
	}
}

func main() {
	fmt.Println("Start")

	for i := 1; i <= 3; i++ {
		result := processNumber(i)
		fmt.Println("Result:", result)
	}

	fmt.Println("End")
}