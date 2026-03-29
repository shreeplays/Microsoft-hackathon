; Save as: processor.asm
; Compile: nasm -f elf64 processor.asm -o processor.o
; Link:    ld processor.o -o processor
; Run:     ./processor

section .data
    msg_menu    db 10, "--- Assembly Menu ---", 10, \
                   "1. Add two numbers", 10, \
                   "2. Check Even/Odd", 10, \
                   "3. Exit", 10, \
                   "Choice: ", 0
    msg_num1    db "Enter first number: ", 0
    msg_num2    db "Enter second number: ", 0
    msg_res     db "The Result is: ", 0
    msg_even    db "The number is EVEN", 10, 0
    msg_odd     db "The number is ODD", 10, 0
    newline     db 10, 0

section .bss
    buffer      resb 16    ; Buffer for user input
    num1        resq 1     ; Store first integer
    num2        resq 1     ; Store second integer
    out_str     resb 21    ; Buffer for output string conversion

section .text
    global _start

_start:
main_loop:
    ; Display Menu
    mov rdi, msg_menu
    call print_string

    ; Get Choice
    call read_input
    movzx rax, byte [buffer]
    
    cmp al, '1'
    je do_addition
    cmp al, '2'
    je do_parity
    cmp al, '3'
    je exit_program
    jmp main_loop

; --- Logic Sections ---

do_addition:
    mov rdi, msg_num1
    call print_string
    call read_input
    call ascii_to_int
    mov [num1], rax

    mov rdi, msg_num2
    call print_string
    call read_input
    call ascii_to_int
    mov [num2], rax

    mov rdi, msg_res
    call print_string

    mov rax, [num1]
    add rax, [num2]
    call int_to_ascii
    call print_string
    mov rdi, newline
    call print_string
    jmp main_loop

do_parity:
    mov rdi, msg_num1
    call print_string
    call read_input
    call ascii_to_int
    
    test rax, 1         ; Test the LSB
    jnz is_odd
    mov rdi, msg_even
    jmp finish_parity
is_odd:
    mov rdi, msg_odd
finish_parity:
    call print_string
    jmp main_loop

; --- Helper Subroutines ---

print_string:
    push rdi
    mov rdx, 0
.loop:                  ; Find string length
    cmp byte [rdi + rdx], 0
    je .done
    inc rdx
    jmp .loop
.done:
    mov rax, 1          ; sys_write
    mov rsi, rdi        ; buffer pointer
    mov rdi, 1          ; stdout
    syscall
    pop rdi
    ret

read_input:
    mov rax, 0          ; sys_read
    mov rdi, 0          ; stdin
    mov rsi, buffer
    mov rdx, 16
    syscall
    ret

ascii_to_int:
    ; Converts string in 'buffer' to integer in RAX
    xor rax, rax
    mov rsi, buffer
.loop:
    movzx rcx, byte [rsi]
    cmp rcx, 10         ; Check for newline
    je .done
    cmp rcx, '0'
    jb .done
    cmp rcx, '9'
    ja .done
    
    sub rcx, '0'
    imul rax, 10
    add rax, rcx
    inc rsi
    jmp .loop
.done:
    ret

int_to_ascii:
    ; Converts integer in RAX to string in 'out_str'
    mov rsi, out_str + 20
    mov byte [rsi], 0   ; Null terminator
    mov rbx, 10
.loop:
    dec rsi
    xor rdx, rdx
    div rbx             ; Divide RAX by 10, remainder in RDX
    add dl, '0'         ; Convert to ASCII
    mov [rsi], dl
    test rax, rax
    jnz .loop
    mov rdi, rsi        ; Return pointer to start of string in RDI
    ret

exit_program:
    mov rax, 60         ; sys_exit
    xor rdi, rdi
    syscall