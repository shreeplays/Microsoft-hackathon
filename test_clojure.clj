(ns test-clojure)

(defn process-number [n]
  (if (even? n)
    (do
      (println "Even number")
      (* n 2))
    (do
      (println "Odd number")
      (+ n 1))))

(defn main []
  (println "Start")

  (doseq [i (range 1 4)]
    (let [result (process-number i)]
      (println "Result:" result)))

  (println "End"))

(main)