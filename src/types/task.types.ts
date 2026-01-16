export type TaskExample = {
    input: string;
    output: string;
    explanation: string;
};

export type TaskTestCase = {
    input: string;
    expected: string;
};

export type Task = {
    id: string;
    title: string;
    language: 'JavaScript' | 'TypeScript' | 'Python';
    difficulty: 'easy' | 'medium';
    statement: string;
    constraints: string[];
    examples: TaskExample[];
    starterCode: string;
    solutionOutline: string[];
    testCases: TaskTestCase[];
};
