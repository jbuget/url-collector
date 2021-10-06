#!/usr/bin/env bash

set -e

current_git_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "${current_git_branch}" != "main" ]
then
  >&2 echo -e "$(tput setaf 1)Current Git branch must be \"main\"$(tput sgr0) ⚠️"
  exit 1
fi

current_git_status=$(git status --porcelain)
if [ "${current_git_status}" ]
then
  >&2 echo -e "$(tput setaf 1)Current Git status must be empty$(tput sgr0) ⚠️"
  exit 1
fi
