---
layout: post
title: Fix Hanging SSH Connection on WSL2 when VPN is Active
date: 2021-06-01 01:05:16 +0700
tags: wsl
---

Sometimes, my SSH connection stucked right after logging in.

```bash
-> % ssh <username>@<host>
Enter passphrase for key '/home/azaky/.ssh/id_rsa':
Welcome to Ubuntu 20.04.2 LTS (GNU/Linux 5.4.0-51-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage
... then it hangs here indefinitely
```

SSH-ing from Powershell (using Windows' OpenSSH) or connecting through VS Code Remote seemed working just fine. And it only happened on some days, on unclear conditions (at first).

Then I found this: [https://github.com/microsoft/WSL/issues/4585#issuecomment-610061194](https://github.com/microsoft/WSL/issues/4585#issuecomment-610061194). Apparently I only encountered the issue when my VPN (on Windows) was active.

Running the suggestion quickly resolved the issue:

```bash
sudo ifconfig eth0 mtu 1350
```
