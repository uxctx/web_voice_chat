const INPUT_SAMPLERATE = 16000;
const PLAY_ScriptProcessor_Size = 256;

Math.gcd = function (a, b) {
    if (!a || !b) {
        console.error("error input Math.gcd ");
        return;
    }
    var temp;
    while (b != 0) {
        temp = a % b;
        a = b;
        b = temp;
    }
    return a;
}

Math.scm = function (a, b) {
    if (!a || !b) {
        console.error("error input Math.scm ");
        return;
    }
    return (a * b) / Math.gcd(a, b);
}

function SilkEncode(scriptProcessor_bsize) {
    if (!(scriptProcessor_bsize == 256 || scriptProcessor_bsize == 520)) {
        console.error("scriptProcessor_bsize  Not predefined");
    }

    this._ectx = Module._silk_encode_init(INPUT_SAMPLERATE);
    this.input_samples = Module._silk_encode_get_insamples(this._ectx);
    console.log("silk_encode input_samples " + this.input_samples);

    this.scriptProcessor_bsize = scriptProcessor_bsize;

    //最小公倍数
    var input_float_samples = Math.scm(this.input_samples, scriptProcessor_bsize);
    //因input_samples和scriptProcessor_bsize不等,申请一个公倍数缓冲buffer，可不用memcpy，
    this.input_float_buffer = Module._malloc(input_float_samples * 4);

    //>> 2     指针地址除以4   必须要括起来 js 运算符的问题
    this.input_float_array = Module.HEAPF32.subarray((this.input_float_buffer >> 2),
        (this.input_float_buffer >> 2) + input_float_samples);

    this.out_silk_buffer_size = 1024 * 2;
    this.out_silk_buffer = Module._malloc(this.out_silk_buffer_size);

    this.input_float_write_samples = 0;
    this.input_float_decode_samples = 0;

}

SilkEncode.prototype.disponse = function () {
    Module._free(this.input_float_buffer);
    Module._free(this.out_silk_buffer);
    Module._silk_encode_free(this._ectx);
}

SilkEncode.prototype.postFloat32Pcm = function (float32pcm) {

    if (float32pcm.length != this.scriptProcessor_bsize) {
        console.error("postFloat32Pcm float32pcm length Not predefined");
    }
    this.input_float_array.set(float32pcm, this.input_float_write_samples);
    this.input_float_write_samples += float32pcm.length;

    //简单的缓冲区组装 每次输入input_samples
    while ((this.input_float_write_samples - this.input_float_decode_samples) >= this.input_samples) {
        var en_out = Module._silk_encode_float32(this._ectx,
            this.input_float_buffer + (this.input_float_decode_samples * 4),
            this.input_samples,
            this.out_silk_buffer,
            this.out_silk_buffer_size
        );
        this.input_float_decode_samples += this.input_samples;
        //console.log(en_out);

        if (this.input_float_decode_samples == this.input_float_write_samples) {
            this.input_float_write_samples = 0;
            this.input_float_decode_samples = 0;
            // console.log("reset")
        }
        if (en_out == -1) {
            console.log("silk_encode error")
            return;
        }

        if (en_out == -2) {
            // console.log("vad return");
            //代表 没有人说话
            if (this.on_silkdata) {
                this.on_silkdata(false);
            }
            return;
        }

        if (this.on_silkdata) {
            var copy_buffer = new Uint8Array(en_out);
            var out_u8array = Module.HEAPU8.subarray(this.out_silk_buffer, this.out_silk_buffer + en_out);
            copy_buffer.set(out_u8array, 0);

            this.on_silkdata(true,copy_buffer);
        }
    }
}


function SilkDecode() {
    this._dctx = Module._silk_decode_init(INPUT_SAMPLERATE);

    var in_silk_size = 1024;
    this.in_silk_ptr = Module._malloc(in_silk_size);
    //in_silk_ptr
    this.in_silk_array = Module.HEAPU8.subarray(
        this.in_silk_ptr,
        this.in_silk_ptr + in_silk_size);

    this.max_out_floatpcm_samples = 1024;
    this.out_float_ptr = Module._malloc(this.max_out_floatpcm_samples * 4);
    this.out_float_array_index = this.out_float_ptr / 4;
    //out_floatpcm_array
    this.out_floatpcm_array = Module.HEAPF32.subarray(
        this.out_float_array_index,
        this.out_float_array_index + this.max_out_floatpcm_samples);
}

SilkDecode.prototype.disponse = function () {
    Module._free(this.in_silk_ptr);
    Module._free(this.out_float_ptr);
    Module._silk_decode_free(this._dctx);
}

SilkDecode.prototype.postSilkData = function (silk_data) {
    this.in_silk_array.set(silk_data, 0);

    var out_size = Module._silk_decode_outfloat32(this._dctx,
        this.in_silk_ptr, silk_data.length,
        this.out_float_ptr,
        this.max_out_floatpcm_samples
    );

    // console.log("_silk_decode " + ret)
    if (out_size < 0) {
        console.log("_silk_decode error " + out_size);
        return;
    }

        if (this.on_floatpcm_data) {
            var floatpcmarr = new Float32Array(out_size);
            floatpcmarr.set(this.out_floatpcm_array.subarray(0, out_size), 0);
    
            this.on_floatpcm_data(floatpcmarr);
        }
}


/*
直接播放floatpcm的类
*/
function PlayPcm(in_samples, play_ScriptProcessor_size) {
    this.in_samples = in_samples;
    this.play_ScriptProcessor_size = play_ScriptProcessor_size;

    var buffer_size = Math.scm(this.in_samples, this.play_ScriptProcessor_size);
    this.cache_buffer = new Float32Array(buffer_size);

    this.cache_buffer_write_index = 0;
    this.cache_buffer_play_index = 0;

    this.audio_buffer_queue = new Array()


    this.playing = false;
    var audioContext = window.AudioContext || window.webkitAudioContext;
    this.paly_audio_context = new audioContext({ sampleRate: INPUT_SAMPLERATE });

    try {
        this.paly_scriptProcess = this.paly_audio_context.createScriptProcessor(this.play_ScriptProcessor_size, 1, 1);
    } catch (error) {
        console.error("createScriptProcessor error");
        return;
    }


    this.gain_node = this.paly_audio_context.createGain(); 
    this.gain_node.connect(this.paly_audio_context.destination); 

    var _this = this;
    this.paly_scriptProcess.onaudioprocess = function (e) {
        var channel_buffer = e.outputBuffer.getChannelData(0);
        var buff = _this.audio_buffer_queue.shift();
        if (buff == undefined) {
            return;
        }
        channel_buffer.set(buff, 0);

    }
    this.paly_scriptProcess.connect(this.gain_node);
}
PlayPcm.prototype.disponse = function () {
    this.gain_node.disconnect(this.paly_audio_context.destination);
    this.paly_scriptProcess.disconnect(this.gain_node);
    this.paly_audio_context.close();

}

PlayPcm.prototype.postPcm = function (buffer) {

    //先组装缓冲区，组装成play_ScriptProcessor_size大小，不然临时组装卡顿，fuck JavaScript
    this.cache_buffer.set(buffer, this.cache_buffer_write_index);
    this.cache_buffer_write_index += buffer.length;


    while ((this.cache_buffer_write_index - this.cache_buffer_play_index) >= this.play_ScriptProcessor_size) {

        var new_paly_item = new Float32Array(this.play_ScriptProcessor_size);

        new_paly_item.set(this.cache_buffer.subarray(this.cache_buffer_play_index, this.cache_buffer_play_index + this.play_ScriptProcessor_size), 0);

        this.audio_buffer_queue.push(new_paly_item);

        this.cache_buffer_play_index += this.play_ScriptProcessor_size;

        if (this.cache_buffer_write_index == this.cache_buffer_play_index) {
            this.cache_buffer_write_index = 0;
            this.cache_buffer_play_index = 0;
        }

    }

}