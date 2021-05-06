---
layout: post
title: Nginx Cheatsheet
date: 2021-05-07 03:04:05 +0700
tags: nginx webserver
---

For general usage: [https://github.com/SimulatedGREG/nginx-cheatsheet](https://github.com/SimulatedGREG/nginx-cheatsheet)

**Proxy pass inside a path**

```nginx
server {
  # normal proxy_pass
  # serve url/uri to 127.0.0.1:8000/uri
  location / {
    proxy_pass http://127.0.0.1:8000/;
  }

  # proxy_pass inside a path
  # serve url/path/uri to 127.0.0.1:8000/uri
  location /path/ {
    # trailing / here is important!
    # it won't work if you don't include it!
    proxy_pass http://127.0.0.1:8000/;
  }
}
```

**Send nothing**

Prefferable method to handle unwanted locations other than 404, is [status code 444](https://httpstatuses.com/444).

Note: under Cloudflare, this will be seen as 520 to end users.

```nginx
server {
  location / {
    return 444;
  }
}
```


