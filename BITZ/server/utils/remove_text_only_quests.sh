ch
find . -maxdepth 1 -type d -regex './history/[0-9]+' | while read dir; do
    if [ ! -d "$dir/imgs" ]; then
        echo "Removing: $dir"
        rm -rf "$dir"
    fi
done