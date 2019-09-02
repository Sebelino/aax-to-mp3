
const url = 'ws://localhost:8087';

console.log("ok creating a websocket");

const connection = new WebSocket(url);

console.log("ok now gonna define the callbacks");

connection.onopen = () => {
    console.log("Connection to server websocket established");
};

connection.onerror = (error) => {
    console.log(`WebSocket error: ${error}`);
};

connection.onmessage = (e) => {
    console.log("client entered onmessage");
    console.log(e.data);

    $("#content").append(
        $("<tr><td>").text(e.data)
    );
};
