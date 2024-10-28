#!/bin/bash

# Open 10 GNOME terminal tabs and run the command in each
for i in {0..9}
do
    gnome-terminal --tab -- bash -c "node server$i.js; read -p 'Press enter to exit...'"
done
