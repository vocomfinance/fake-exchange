import * as zmq from 'zeromq';

const rpcAddress = 'tcp://127.0.0.1:3000';
const eventAddress = 'tcp://127.0.0.1:3001';

const request = new zmq.Request;
const sub = new zmq.Subscriber;

// const runRpc = async () => {
//   await request.connect(rpcAddress);

//   await request.send(JSON.stringify({
//     commandName: 'ping',
//     payload: 'ignored shitload',
//   }));
//   const [result] = await request.receive();

//   console.log(result.toString());
// }

const runRpc = async () => {
  await request.connect(rpcAddress);

  await request.send(JSON.stringify({
    commandName: 'createOrder',
    payload: {
      tradingPairId: 'fake',
      orderDetails: {
        type: 1,
        shares: 10,
        price: 10.51,
      }
    },
  }));
  const [result] = await request.receive();

  console.log(result.toString());
}

const runSub = async () => {
  sub.connect(eventAddress);
  sub.subscribe('events');

  for await (const [topic, msg] of sub) {
    console.log("received a message related to:", topic.toString(), "containing message:", msg.toString())
  }
}

runSub().catch(e => {
  console.error(e);
  process.exit(1);
});

runRpc()
