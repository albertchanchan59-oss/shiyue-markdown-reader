#!/bin/zsh
cd -- "${0:A:h}"
reader_node="$(command -v node)"
if [[ -z "$reader_node" && -x /opt/homebrew/bin/node ]]; then
  reader_node=/opt/homebrew/bin/node
fi
if [[ -z "$reader_node" && -x /usr/local/bin/node ]]; then
  reader_node=/usr/local/bin/node
fi
if [[ -z "$reader_node" ]]; then
  print '没有找到 Node.js。可以直接双击「拾页阅读器.html」使用离线版。'
  read -k 1 '?按任意键关闭。'
  exit 1
fi
"$reader_node" server.mjs --open
if [[ $? != 0 ]]; then
  read -k 1 '?按任意键关闭。'
fi
