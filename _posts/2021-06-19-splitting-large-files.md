---
layout: post
title: Splitting Large Files on File Server
date: 2021-06-19 00:24:14 +0700
tags: unix
---

When downloading large files with low bandwidth, it is always preferred to download the files in chunks. The idea is so that we can resume the downloads safely when the internet is interrupted in the middle, while not throwing away the bytes that we already downloaded.

### Server Side

This will split the file(s) into 128 MB chunks. We can use `split`, which is faster because it will split the files as-is, and on the other hand, `zip` won't make the files any smaller for large binary files. However, the upside of using `zip` is we can preserve the filenames and the directory structure if there are multiple files and folders involved.

```bash
zip -s 128m parts/output.zip filename [...filenames]
```

It's also a good idea to have the checksum ready, so we can verify the downloaded files on the client-side.

```bash
sha256sum parts/* | tee -a parts/sha256sum.txt
sha256sum filename(s) | tee -a parts/sha256sum.txt
```

### Client Side

Now, on the client-side, we will use the power of `wget`'s recursive downloads. It is assumed that the above files are served through a file server with directory listing enabled.

```bash
wget -r -np -nc <url>
```

After the download is finished, we can just `cat` the files into one big zip file and `unzip` as usual. There will be warnings, however.

```bash
cat output.z* > output-full.zip
unzip output-full.zip
```

Another alternative is to unzip the `.zip` file using 7zip, it will correctly take into account all the `zxx` files.
