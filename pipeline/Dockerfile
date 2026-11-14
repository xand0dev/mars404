# F3 pipeline. GDAL 3.11.4 (Python 3 у образі); digest перевірено registry inspect 10.11.2026.
# Скрипти використовують лише стандартну бібліотеку: TIFF Trek читає trek.py.
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.11.4@sha256:4b94b5e76e8b5616a4d5dc38e6e20def10ab70c3487eeb923d90547372e70a03
WORKDIR /work
COPY pipeline/*.py /work/
# fetch: мережа, один раз → /cache.  prepare: офлайн, /cache → /out.
ENTRYPOINT ["python3"]
CMD ["/work/prepare.py", "--cache", "/cache", "--output", "/out"]
