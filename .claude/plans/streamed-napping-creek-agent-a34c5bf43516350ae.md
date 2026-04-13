# Plan: Remove Dead INSTALL_HINT Constant

## Task
Remove the dead `INSTALL_HINT` constant and its test from the Open Harness repo.

## Changes Required

### File 1: packages/sandbox/src/cli/cli.ts
- **Location:** Lines 35-36
- **Change:** Delete the `INSTALL_HINT` constant declaration:
  ```typescript
  export const INSTALL_HINT =
    "Sandbox tools not installed. Run: openharness install @openharness/sandbox";
  ```
- **Impact:** This constant is no longer used as the old "installable package" model has been replaced with a bundled CLI + sandbox tools

### File 2: packages/sandbox/src/__tests__/cli.test.ts
- **Location 1:** Line 5 in imports
  - **Change:** Remove `INSTALL_HINT` from the import statement
- **Location 2:** Lines 84-88
  - **Change:** Delete the entire test block:
    ```typescript
    describe("INSTALL_HINT", () => {
      it("mentions openharness install", () => {
        expect(INSTALL_HINT).toContain("openharness install @openharness/sandbox");
      });
    });
    ```

## Next Steps (after approval)
1. Edit cli.ts to remove the INSTALL_HINT constant
2. Edit cli.test.ts to remove the INSTALL_HINT import and test block
3. Verify no other references to INSTALL_HINT exist in the codebase
4. Create a commit with the changes
