// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NumberProcessor {

    function processNumber(uint n) public pure returns (uint) {
        if (n % 2 == 0) {
            return n * 2;
        } else {
            return n + 1;
        }
    }

    function run() public pure returns (uint) {

        uint result = 0;

        for (uint i = 1; i <= 3; i++) {
            result = processNumber(i);
        }

        return result;
    }
}