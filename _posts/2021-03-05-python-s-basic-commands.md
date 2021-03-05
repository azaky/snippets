---
layout: post
title: Python's basic commands
date: 2021-03-05 17:21:03 +0700
tags: python
---

## Iteration

Iterate through range:

```python
for i in range(100):
    print(i)
```

Iterate through dict:

```python
obj = { 'key': 'value' }
for key, value in obj.items():
    print(key, value)
for key in obj.keys():
    print(key)
for value in obj.values():
    print(value)
```

## Pandas

Iterate through pd.DataFrame rows:

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({'value': np.arange(0, 100)})

for index, row in df.iterrows():
    print(index, row.value)
```

## Numpy

TODO
