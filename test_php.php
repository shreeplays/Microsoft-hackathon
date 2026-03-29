<?php

function processNumber($n) {
    if ($n % 2 == 0) {
        echo "Even number\n";
        return $n * 2;
    } else {
        echo "Odd number\n";
        return $n + 1;
    }
}

function main() {
    echo "Start\n";

    for ($i = 1; $i <= 3; $i++) {
        $result = processNumber($i);
        echo "Result: $result\n";
    }

    echo "End\n";
}

main();

?>