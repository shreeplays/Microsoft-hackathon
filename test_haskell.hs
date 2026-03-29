processNumber :: Int -> Int
processNumber n =
    if mod n 2 == 0
        then n * 2
        else n + 1

main :: IO ()
main = do
    putStrLn "Start"

    let numbers = [1,2,3]

    mapM_ (\i -> do
        let result = processNumber i
        putStrLn ("Result: " ++ show result)
        ) numbers

    putStrLn "End"