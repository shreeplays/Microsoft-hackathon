function processNumber(n)
    if n % 2 == 0 then
        print("Even number")
        return n * 2
    else
        print("Odd number")
        return n + 1
    end
end

function main()
    print("Start")

    for i = 1, 3 do
        local result = processNumber(i)
        print("Result:", result)
    end

    print("End")
end

main()