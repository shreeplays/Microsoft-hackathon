#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, i, *ptr, sum = 0;

    printf("Enter number of elements: ");
    if (scanf("%d", &n) != 1) return 1;

    // Dynamic memory allocation
    ptr = (int*)malloc(n * sizeof(int));

    if (ptr == NULL) {
        printf("Memory allocation failed!\n");
        return 1;
    }

    for (i = 0; i < n; ++i) {
        ptr[i] = i + 1; // Assigning values 1, 2, 3...
        sum += ptr[i];
    }

    printf("Sum of elements: %d\n", sum);
    
    // Always free your memory!
    free(ptr);
    
    return 0;
}