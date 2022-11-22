import * as zmq from 'zeromq';

interface MessageRpcCommand {
  commandName: string;
  payload: any;
}

type MessageRpcReply = MessageRpcReplySuccess | MessageRpcReplyError;

interface MessageRpcReplySuccess {
  response: any;
}

interface MessageRpcReplyError {
  error: string;
  errorMessage?: string;
}

type MessageBrokerRpcCallback = (msg: MessageRpcCommand) => MessageRpcReply;

interface IMessageBroker {
  emitEvent(topic: string, payload: Object): Promise<void>;
  listen(host: string, rpcPort: number, eventsPort: number, rpcCallback: MessageBrokerRpcCallback): Promise<void>;
}

class MessageBroker implements IMessageBroker {
  pub: zmq.Publisher;
  replier: zmq.Reply;

  constructor() {
    this.pub = new zmq.Publisher;
    this.replier = new zmq.Reply;
  }

  async emitEvent(topic: string, payload: Object) {
    return this.pub.send([topic, JSON.stringify(payload)]);
  }

  async listen(host: string, rpcPort: number, eventsPort: number, rpcCallback: MessageBrokerRpcCallback) {
    await this.pub.bind(`tcp://${host}:${eventsPort}`);

    await this.replier.bind(`tcp://${host}:${rpcPort}`);

    for await (const [msg] of this.replier) {
      const response = rpcCallback(JSON.parse(msg.toString()))
      await this.replier.send(JSON.stringify(response));
    }
  }
}

export default MessageBroker;
export {
  MessageRpcCommand,
  MessageRpcReply,
  IMessageBroker,
}
