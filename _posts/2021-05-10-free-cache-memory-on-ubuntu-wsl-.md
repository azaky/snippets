---
layout: post
title: Free Cache Memory on Ubuntu (WSL)
date: 2021-05-10 00:44:25 +0700
tags: wsl ubuntu
---

On standalone Linux OS, this should never be a problem because the OS is smart enough to drop caches whenever other applications need it.

However, on WSL, this may be a problem because the subsystem may not be directly notified if Windows apps need more memory. Hence, manual intervention is often needed.

```bash
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

Reference: https://www.kernel.org/doc/Documentation/sysctl/vm.txt
