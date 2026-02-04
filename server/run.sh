# kill existing process
pkill -f parking.py

# wait for 1 second
sleep 1

# change directory
cd /home/ubuntu/ParkingGet

# run parking.py
nohup /home/ubuntu/ParkingGet/venv/bin/python -u parking.py > nohup.out 2>&1 &

# check process
ps aux | grep parking.py
