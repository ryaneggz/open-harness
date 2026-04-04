.PHONY: ralph params archive

ENV ?= dev
MAX_ITERATIONS ?= 200

# Display current environment and iteration settings
params:
	@echo "Environment: $(ENV) | Max iterations: $(MAX_ITERATIONS)"

# Run the Ralph autonomous agent loop using Claude Code
ralph:
	.ralph/ralph.sh --tool claude $(MAX_ITERATIONS)

# Archive current prd.json and progress.txt into dated directory
archive:
	claude --dangerously-skip-permissions -p "Archive the latest prd.json & progress.txt into \`./.ralph/archive/YYYY-MM-DD/prd.json\` and \`./.ralph/archive/YYYY-MM-DD/progress.json\` respectively. Create the directory if it doesn't exist."
