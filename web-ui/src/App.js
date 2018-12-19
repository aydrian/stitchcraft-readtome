import React, { Component } from 'react'
import { Stitch, AnonymousCredential } from 'mongodb-stitch-browser-sdk'
import {
  AwsServiceClient,
  AwsRequest
} from 'mongodb-stitch-browser-services-aws'
import BSON from 'bson'
import FileInput from './components/FileInput'
import './App.css'

const convertImageToBSONBinaryObject = file => {
  return new Promise(resolve => {
    var fileReader = new FileReader()
    fileReader.onload = event => {
      var eventBinary = new BSON.Binary(new Uint8Array(event.target.result))
      resolve(eventBinary)
    }
    fileReader.readAsArrayBuffer(file)
  })
}

class App extends Component {
  constructor(props) {
    super(props)
    this.appId = 'stitchcraft-readtome-jhjcq'

    this.state = {
      image: null,
      text: '',
      audio: null
    }

    this.handleFileUpload = this.handleFileUpload.bind(this)
    this.audio_ref = React.createRef()
  }

  componentDidMount() {
    this.client = Stitch.initializeDefaultAppClient(this.appId)
    this.client.auth.loginWithCredential(new AnonymousCredential())
    this.aws = this.client.getServiceClient(AwsServiceClient.factory, 'AWS')
  }

  handleFileUpload(file) {
    if (!file) {
      return
    }

    this.setState({ image: URL.createObjectURL(file), text: '', audio: null })

    convertImageToBSONBinaryObject(file)
      .then(result => {
        console.log(result)

        const args = {
          Image: {
            Bytes: result
          }
        }

        const request = new AwsRequest.Builder()
          .withService('rekognition')
          .withAction('DetectText')
          .withRegion('us-east-1')
          .withArgs(args)
          .build()

        return this.aws.execute(request)
      })
      .then(result => {
        console.log(result.TextDetections)
        const text = result.TextDetections[0].DetectedText
        console.log(text)
        this.setState({ text })

        const args = {
          OutputFormat: 'mp3',
          Text: text,
          VoiceId: 'Brian'
        }

        const request = new AwsRequest.Builder()
          .withService('polly')
          .withAction('SynthesizeSpeech')
          .withRegion('us-east-1')
          .withArgs(args)
          .build()

        return this.aws.execute(request)
      })
      .then(result => {
        console.log(result)
        const blob = new Blob([result.AudioStream.buffer], {
          type: result.ContentType
        })
        this.setState({ audio: URL.createObjectURL(blob) })
      })
  }

  render() {
    return (
      <div className="App">
        <FileInput handleFileUpload={this.handleFileUpload} />
        {this.state.image && (
          <img width="200" src={this.state.image} alt="uploaded" />
        )}
        {this.state.text && <h3>{this.state.text}</h3>}
        {this.state.audio && (
          <audio
            ref={this.audio_ref}
            src={this.state.audio}
            autoPlay
            controls
          />
        )}
      </div>
    )
  }
}

export default App
