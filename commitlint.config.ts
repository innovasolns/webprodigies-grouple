import type { UserConfig } from "@commitlint/types"

const Configuration: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "wip", "patch", "build"]],
    "type-empty": [2, "never"],
    "type-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-case": [2, "always", "lower-case"],
    "subject-full-stop": [2, "never", "."],
  },
}

export default Configuration
