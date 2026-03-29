func processNumber(_ n: Int) -> Int {
    if n % 2 == 0 {
        print("Even number")
        return n * 2
    } else {
        print("Odd number")
        return n + 1
    }
}

func main() {
    print("Start")

    for i in 1...3 {
        let result = processNumber(i)
        print("Result: \(result)")
    }

    print("End")
}

main()