# Completion (zsh native)
autoload -Uz compinit && compinit

# Git info in RPROMPT: (branch @short-hash) — empty outside a repo.
#   branch  — yellow
#   @hash   — dim (first 7 chars of HEAD)
#   action  — red during rebase/merge/cherry-pick
autoload -Uz vcs_info
zstyle ':vcs_info:*' enable git
zstyle ':vcs_info:git:*' get-revision true
zstyle ':vcs_info:git:*' formats       '(%F{yellow}%b%f %F{244}@%i%f)'
zstyle ':vcs_info:git:*' actionformats '(%F{yellow}%b%f|%F{red}%a%f %F{244}@%i%f)'

# Abbreviate SHA to 7 chars
+vi-shorten-rev() { hook_com[revision]=${hook_com[revision][1,7]} }
zstyle ':vcs_info:git+set-message:*' hooks shorten-rev

precmd() { vcs_info }

# Bash-like left prompt (Ubuntu default: green user@host, blue path).
# Branch lives in RPROMPT in yellow.
setopt PROMPT_SUBST
PROMPT='%B%F{green}%n@%m%f%b:%B%F{blue}%~%f%b$ '
RPROMPT='${vcs_info_msg_0_}'

# History — dedup + share across sessions
HISTFILE=~/.zsh_history
HISTSIZE=10000
SAVEHIST=10000
setopt HIST_IGNORE_DUPS SHARE_HISTORY

# Keybindings — emacs mode (matches bash default)
bindkey -e

# Aliases (mirror .bashrc)
alias claude='claude --dangerously-skip-permissions'
alias codex='codex --full-auto'
alias pi='pi'
alias mom='mom --sandbox=host ~/harness/workspace/.slack'

cd ~/harness 2>/dev/null
