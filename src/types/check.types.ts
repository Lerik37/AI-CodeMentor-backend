export type CheckResult = {
    passed: boolean;
    score: number;
    summary: string;
    feedback: string;
    fixes: string[];
    edgeCases: string[];
};
