function process_number(n)
    if n % 2 == 0
        println("Even number")
        return n * 2
    else
        println("Odd number")
        return n + 1
    end
end

function main()
    println("Start")

    for i in 1:3
        result = process_number(i)
        println("Result: ", result)
    end

    println("End")
end

main()