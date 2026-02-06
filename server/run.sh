# kill existing process
pkill -f starting.py

# wait for 1 second
sleep 1

# change directory
cd /home/ubuntu/ParkingGet/server

# run parking.py
nohup /home/ubuntu/ParkingGet/venv/bin/python -u start.py > nohup.out 2>&1 &

# check process
ps aux | grep start.py
