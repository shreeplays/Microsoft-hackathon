IDENTIFICATION DIVISION.
       PROGRAM-ID. NUMBERPROC.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 I        PIC 9 VALUE 1.
       01 RESULT   PIC 99.

       PROCEDURE DIVISION.
       MAIN-PARA.
           DISPLAY "Start".

           PERFORM VARYING I FROM 1 BY 1 UNTIL I > 3
               PERFORM PROCESS-NUMBER
               DISPLAY "Result: " RESULT
           END-PERFORM.

           DISPLAY "End".
           STOP RUN.

       PROCESS-NUMBER.
           IF FUNCTION MOD(I, 2) = 0
               DISPLAY "Even number"
               COMPUTE RESULT = I * 2
           ELSE
               DISPLAY "Odd number"
               COMPUTE RESULT = I + 1
           END-IF.
           EXIT.