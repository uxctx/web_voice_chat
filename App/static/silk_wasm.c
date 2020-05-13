
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "SKP_Silk_SDK_API.h"
#include "SKP_Silk_SigProc_FIX.h"

#include <emscripten.h>
#include <emscripten/html5.h>

#include "vad.h"

typedef struct _silk_encode
{
    void *encodeEec;
    SKP_int32 packetSize_ms;
    SKP_SILK_SDK_EncControlStruct encControl;

    size_t in_samples;

    short *input_int16_samples;
    size_t input_int16_samples_size;

    void *vadInst;

} silk_encode_ctx;

EMSCRIPTEN_KEEPALIVE short silk_encode_float32(silk_encode_ctx *_ectx, float *input_floatpcm, int in_samples, unsigned char *out_silk, int max_out_byte)
{

    if (in_samples != _ectx->in_samples)
    {
        emscripten_console_log("SKP_Silk_SDK_Encode in_samples error~");
        return 0;
    }

    for (int i = 0; i < _ectx->in_samples; i++)
    {
        float n = input_floatpcm[i];
        // short s = 0;
        // n = ((n < -1) ? -1 : ((n > 1) ? 1 : n));
        // n = n + 1;
        // s = (int)(n * 32767.5f);

        // s = s - 32768;
        _ectx->input_int16_samples[i] = n * 32767.5f;
        // _ectx->input_int16[i] = n * 32767.0f;
    }

    int nVadRet = WebRtcVad_Process(_ectx->vadInst, _ectx->encControl.API_sampleRate, _ectx->input_int16_samples, in_samples, 1);

    if (nVadRet < 0)
    {
        emscripten_console_log("WebRtcVad_Process error~");
        return -1;
    }

    if (nVadRet == 0)
    {
        return -2;
    }

    SKP_int16 nBytesOut = max_out_byte;
    if (SKP_Silk_SDK_Encode(_ectx->encodeEec, &_ectx->encControl,
                            _ectx->input_int16_samples, _ectx->in_samples,
                            out_silk, &nBytesOut) < 0)
    {
        emscripten_console_log("SKP_Silk_SDK_Encode Return error~");
        return -1;
    }

    return nBytesOut;
}

EMSCRIPTEN_KEEPALIVE void silk_encode_free(silk_encode_ctx *_ectx)
{
    free(_ectx->encodeEec);
    free(_ectx->input_int16_samples);

    _ectx->encodeEec = NULL;
    free(_ectx);
}


EMSCRIPTEN_KEEPALIVE silk_encode_ctx *silk_encode_init(size_t input_sampleRate)
{
    SKP_int32 encSizeBytes;

    SKP_Silk_SDK_Get_Encoder_Size(&encSizeBytes);

    void *encodeEec = malloc(encSizeBytes);

    SKP_SILK_SDK_EncControlStruct encStatus;

    SKP_Silk_SDK_InitEncoder(encodeEec, &encStatus); /* Reset Encoder */

    silk_encode_ctx *_ectx = (silk_encode_ctx *)malloc(sizeof(silk_encode_ctx));

    memset(_ectx, 0, sizeof(silk_encode_ctx));
    _ectx->encodeEec = encodeEec;

    _ectx->packetSize_ms = 20; //20ms毫秒算一个帧

    /* Set Encoder parameters */
    _ectx->encControl.API_sampleRate = input_sampleRate;                             //输入采样率
    _ectx->encControl.maxInternalSampleRate = 24000;                                 //最大内部采样率
    _ectx->encControl.packetSize = (_ectx->packetSize_ms * input_sampleRate) / 1000; //一个帧采样数大小
    _ectx->encControl.packetLossPercentage = 0;                                      //上行链路损耗估计，以百分比（0-100）；默认值：0”）
    _ectx->encControl.useInBandFEC = 0;                                              //启用带内FEC使用（0/1）；默认值：0”）；
    _ectx->encControl.useDTX = 0;                                                    //启用DTX（0/1）；默认值：0”）
    _ectx->encControl.complexity = 1;                                                // 复杂度模式； 0最低； 1为中等，2为最高复杂度
    _ectx->encControl.bitRate = 25000;                                               //目标比特率

    _ectx->in_samples = _ectx->packetSize_ms * _ectx->encControl.API_sampleRate / 1000;

    _ectx->input_int16_samples_size = _ectx->in_samples;
    _ectx->input_int16_samples = (short *)malloc(_ectx->input_int16_samples_size * (sizeof(short)));

    emscripten_console_log("********** Silk Encoder [No Loss] (Single Precision) v 1.0.9 ***************");

    _ectx->vadInst = WebRtcVad_Create();
    if (_ectx->vadInst == NULL){
        emscripten_console_log("WebRtcVad_Create fail\n");
        silk_encode_free(_ectx);
           return 0;
    }
     
    int status = WebRtcVad_Init(_ectx->vadInst);
    if (status != 0)
    {
        emscripten_console_log("WebRtcVad_Init fail\n");
        WebRtcVad_Free(_ectx->vadInst);
        silk_encode_free(_ectx);
        return 0;
    }
    //    Aggressiveness mode (0, 1, 2, or 3)
    status = WebRtcVad_set_mode(_ectx->vadInst, 1);
    if (status != 0)
    {
        printf("WebRtcVad_set_mode fail\n");
        WebRtcVad_Free(_ectx->vadInst);
        silk_encode_free(_ectx);
        return 0;
    }

    return _ectx;
}


EMSCRIPTEN_KEEPALIVE int silk_encode_get_insamples(silk_encode_ctx *_ectx)
{
    return _ectx->in_samples;
}


typedef struct _silk_decode
{
    void *decodeDec;
    SKP_SILK_SDK_DecControlStruct DecControl;

    size_t output_samples_size;
    short *output_pcm16_samples;

} silk_decode_ctx;

EMSCRIPTEN_KEEPALIVE silk_decode_ctx *silk_decode_init(int out_sampleRate)
{

    SKP_int32 decSizeBytes = 0;
    void *decodeDec;
    emscripten_console_log("********** Silk Decoder [No Loss] (Single Precision) v 1.0.9 ***************");

    SKP_Silk_SDK_Get_Decoder_Size(&decSizeBytes);
    decodeDec = malloc(decSizeBytes);
    if (decodeDec == NULL)
    {
        emscripten_console_log("malloc null\n");
        return NULL;
    }
    SKP_Silk_SDK_InitDecoder(decodeDec);

    silk_decode_ctx *_dectx = (silk_decode_ctx *)malloc(sizeof(silk_decode_ctx));

    _dectx->DecControl.API_sampleRate = out_sampleRate;
    _dectx->DecControl.framesPerPacket = 1;
    _dectx->decodeDec = decodeDec;

    _dectx->output_samples_size = 1024; //20ms才320采样，40ms也才640

    _dectx->output_pcm16_samples = (short *)malloc(_dectx->output_samples_size * sizeof(short));

    return _dectx;
}

EMSCRIPTEN_KEEPALIVE void silk_decode_free(silk_decode_ctx *_dectx)
{
    free(_dectx->decodeDec);

    free(_dectx->output_pcm16_samples);
    _dectx->decodeDec = NULL;
    free(_dectx);
}

EMSCRIPTEN_KEEPALIVE int silk_decode_outfloat32(silk_decode_ctx *_dectx,unsigned char*in_silk, int in_size,float* out_floatpcm,int max_outsamples)
{
    SKP_int16 nSamplesOut = max_outsamples;
    do
    {
        if (SKP_Silk_SDK_Decode(_dectx->decodeDec, &_dectx->DecControl, 0, in_silk, in_size, _dectx->output_pcm16_samples, &nSamplesOut) < 0)
        {
            emscripten_console_log("SKP_Silk_SDK_Decode Return error~ ");
        }
    } while (_dectx->DecControl.moreInternalDecoderFrames);

    for (size_t i = 0; i < nSamplesOut; i++)
    {
       out_floatpcm[i] = (double)_dectx->output_pcm16_samples[i] / 32767.5f;
    }

    return nSamplesOut;
}

int main(int argc, char *argv[])
{
    emscripten_console_log("[silk wasm]");
}