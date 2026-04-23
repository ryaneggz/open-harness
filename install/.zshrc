export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="robbyrussell"

plugins=(
  git
  gh
  docker
  docker-compose
  npm
  node
  pnpm
  tmux
  zsh-autosuggestions
  zsh-syntax-highlighting
  zsh-history-substring-search
)

source $ZSH/oh-my-zsh.sh

alias claude='claude --dangerously-skip-permissions'
alias codex='codex --full-auto'
alias pi='pi'
alias mom='mom --sandbox=host ~/harness/workspace/.slack'

bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

cd ~/harness 2>/dev/null
