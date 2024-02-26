let APP_ID = '8c2212a543f74105b9dd82c0600d34a0'

let token = null;
let uid = String(Math.floor(Math.random() * 10000))

let client;
let channel;

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')


if (!roomId) {
    window.location = 'lobby.html'
}

let localstream;
let remoteStream;
let peerConnection;

// 获取公网IP地址
const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}


let constrains = {
    video: {
        width: {
            min: 640, ideal: 1920, max: 1920
        },
        height: {
            min: 480, ideal: 1080, max: 1080
        },
    },
    audio:true
}
let init = async () => {
    client = await AgoraRTM.createInstance(APP_ID)
    console.log(uid)
    // console.log(client)
    await client.login({ uid, token })

    // index.html?room=12321
    channel = client.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)
    client.on('MessageFromPeer', handleMessageFromPeer)


    localstream = await navigator.mediaDevices.getUserMedia(constrains)
    document.getElementById('user-1').srcObject = localstream


}

let handleUserLeft = async (MemberId) => {
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('small-frame')
}

let handleMessageFromPeer = async (message, MemberId) => {
    console.log("Message:", JSON.parse(message.text))
    message = JSON.parse(message.text)
    if (message.type == 'offer') {
        console.log(123123123)
        createAnswer(MemberId, message.offer)
    }

    if (message.type === 'answer') {
        addAnswer(message.answer)
    }

    if (message.type === 'candidate') {
        if (peerConnection) {
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

let handleUserJoined = async (MemberId) => {
    console.log('A new user joined', MemberId)
    createOffer(MemberId)
}


let createPeerConnection = async (MemberId) => {
    // 建立连接
    peerConnection = new RTCPeerConnection(servers)
    // 新建远程影像
    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block'
    document.getElementById('user-1').classList.add('small-frame')

    if (!localstream) {
        localstream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        document.getElementById('user-1').srcObject = localstream
    }

    console.log(localstream.getTracks())

    // 将本地影像加入到连接中
    localstream.getTracks().forEach((track) => {
        console.log(track)
        peerConnection.addTrack(track, localstream)

    })

    // 将连接中的影像加入到远程影像里
    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track)
        })
    }


    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            console.log("New ICE candidate:", event.candidate)
            client.sendMessageToPeer({ text: JSON.stringify({ type: 'candidate', candidate: event.candidate }) }, MemberId)
        }
    }



}

// peer one
let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    // console.log('offer:', offer)

    client.sendMessageToPeer({ text: JSON.stringify({ type: 'offer', offer: offer }) }, MemberId)


}
// PEER TWO 
let createAnswer = async (MemberId, offer) => {

    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)


    client.sendMessageToPeer({ text: JSON.stringify({ type: 'answer', answer: answer }) }, MemberId)
    console.log(answer, '123231')
}

// Peer one
let addAnswer = async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription((answer))
    }
}


let leaveChannel = async () => {
    await channel.leave()
    await client.logout()
}

let toggleCamera = async () => {
    let videoTrack = localstream.getTracks().find(track => track.kind === 'video')

    console.log(localstream.getTracks())

    if (videoTrack.enabled) {
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255,80,80)'

    } else {
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.backgroundColor = 'black'

    }
}

let toggleMic = async () => {
    let audioTrack = localstream.getTracks().find(track => track.kind === 'audio')

    if (audioTrack.enabled) {
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255,80,80)'

    } else {
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.backgroundColor = 'black'

    }
}



window.addEventListener('beforeunload', leaveChannel)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
init()