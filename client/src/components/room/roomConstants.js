export const LANGUAGES = {
    javascript: { label: "JavaScript", template: `// Write your solution here\nfunction solve(input) {\n  return input;\n}\n\nconsole.log(solve("hello"));\n` },
    python: { label: "Python", template: `# Write your solution here\ndef solve(s):\n    return s\n\nprint(solve("hello"))\n` },
    cpp: { label: "C++", template: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "hello" << endl;\n    return 0;\n}\n` },
    java: { label: "Java", template: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("hello");\n    }\n}\n` }
}

export const VERDICTS = [
    { value: "strong_hire", label: "Strong Hire", style: "bg-emerald-600 text-white" },
    { value: "hire", label: "Hire", style: "bg-emerald-100 text-emerald-700" },
    { value: "no_hire", label: "No Hire", style: "bg-red-100 text-red-600" },
    { value: "strong_no_hire", label: "Strong No Hire", style: "bg-red-600 text-white" }
]

export const emptyScorecard = { problemSolving: 0, coding: 0, communication: 0, fundamentals: 0, notes: "", verdict: "" }
