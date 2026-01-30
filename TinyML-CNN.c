/*
 * PROJETO: TinyML CNN (MNIST) + MQTT na Raspberry Pi Pico W
 *
 * FUNCIONALIDADE:
 * 1. Conecta no Wi-Fi.
 * 2. Conecta em um broker MQTT.
 * 3. Recebe uma imagem (784 bytes) via tópico MQTT.
 * 4. Recebe um comando para executar inferência.
 * 5. Executa a CNN localmente (TensorFlow Lite Micro).
 * 6. Publica o resultado (classe + confiança) em JSON.
 *
 * ARQUITETURA:
 * - Super loop (sem RTOS)
 * - lwIP + MQTT (TCP sem TLS)
 * - Inferência local (edge AI)
 */

#include "pico/stdlib.h"
#include "pico/cyw43_arch.h"
#include "pico/unique_id.h"

#include "lwip/apps/mqtt.h"
#include "lwip/dns.h"

#include "tflm_wrapper.h"
#include <math.h>
#include <string.h>

// ======================================================
// CONFIGURAÇÕES DE REDE
// ======================================================
#define WIFI_SSID       "SEU_SSID"
#define WIFI_PASSWORD   "SUA_SENHA"

#define MQTT_SERVER     "192.168.0.10"
// #define MQTT_PORT       1883
#define MQTT_USERNAME   "SEU_USER"
#define MQTT_PASSWORD   "SUA_SENHA"

#define MQTT_KEEP_ALIVE_S 60
#define MQTT_TOPIC_LEN  100

// Tópicos MQTT do projeto
#define TOPIC_IMG_SUFFIX  "/vetor_imagem"  // Recebe imagem
#define TOPIC_CMD_SUFFIX  "/rodarcnn"      // Comando de inferência
#define TOPIC_RES_SUFFIX  "/resultado"     // Publica resultado

// ======================================================
// PARÂMETROS DO MODELO
// ======================================================
#define IMAGE_SIZE 784 // 28x28 pixels

// Buffer que armazena a imagem recebida
static uint8_t image_buffer[IMAGE_SIZE];
static int bytes_rec_count = 0;

// Flags de controle
static bool flag_nova_imagem = false;
static bool flag_rodar_inferencia = false;

// ======================================================
// ESTRUTURA DO CLIENTE MQTT
// ======================================================
typedef struct {
    mqtt_client_t* mqtt_client_inst;
    struct mqtt_connect_client_info_t mqtt_client_info;
    char topic[MQTT_TOPIC_LEN];
    ip_addr_t mqtt_server_address;
    bool connect_done;
} MQTT_CLIENT_DATA_T;

// ======================================================
// FUNÇÕES AUXILIARES (TFLM)
// ======================================================

// Retorna o índice do maior valor (classe prevista)
static int argmax_i8(const int8_t* v, int n) {
    int best = 0;
    int8_t bestv = v[0];
    for (int i = 1; i < n; i++) {
        if (v[i] > bestv) {
            bestv = v[i];
            best = i;
        }
    }
    return best;
}

// Quantiza float para int8 conforme parâmetros do modelo
static int8_t quantize_f32_to_i8(float x, float scale, int zp) {
    long q = lroundf(x / scale) + zp;
    if (q < -128) q = -128;
    if (q > 127)  q = 127;
    return (int8_t)q;
}

// ======================================================
// PROTÓTIPOS MQTT
// ======================================================
static void pub_request_cb(void *arg, err_t err);
static const char *full_topic(const char *name);
static void mqtt_incoming_data_cb(void *arg, const u8_t *data, u16_t len, u8_t flags);
static void mqtt_incoming_publish_cb(void *arg, const char *topic, u32_t tot_len);
static void mqtt_connection_cb(mqtt_client_t *client, void *arg, mqtt_connection_status_t status);
static void start_client(MQTT_CLIENT_DATA_T *state);
static void dns_found(const char *hostname, const ip_addr_t *ipaddr, void *arg);

// ======================================================
// FUNÇÃO PRINCIPAL
// ======================================================
int main(void) {
    stdio_init_all();
    sleep_ms(2000); // Aguarda USB serial

    printf("=== TinyML + MQTT ===\n");

    // Inicializa o TensorFlow Lite Micro
    if (tflm_init() != 0) panic("Erro ao iniciar TFLM");

    // Ponteiros de entrada e saída do modelo
    int in_bytes, out_bytes;
    int8_t* in = tflm_input_ptr(&in_bytes);
    int8_t* out = tflm_output_ptr(&out_bytes);

    // Parâmetros de quantização
    float in_scale = tflm_input_scale();
    int in_zp = tflm_input_zero_point();
    float out_scale = tflm_output_scale();
    int out_zp = tflm_output_zero_point();

    // Estrutura do cliente MQTT
    static MQTT_CLIENT_DATA_T state;
    memset(&state, 0, sizeof(state));

    // Inicializa Wi-Fi
    if (cyw43_arch_init()) panic("Erro ao iniciar Wi-Fi");
    cyw43_arch_enable_sta_mode();

    // Gera ID único do dispositivo
    char unique_id_buf[10];
    pico_get_unique_board_id_string(unique_id_buf, sizeof(unique_id_buf));
    static char client_id_buf[30];
    snprintf(client_id_buf, sizeof(client_id_buf), "pico_%s", unique_id_buf);

    // Configuração do cliente MQTT
    state.mqtt_client_info.client_id = client_id_buf;
    state.mqtt_client_info.keep_alive = MQTT_KEEP_ALIVE_S;
    state.mqtt_client_info.client_user = MQTT_USERNAME;
    state.mqtt_client_info.client_pass = MQTT_PASSWORD;

    printf("Conectando no Wi-Fi...\n");
    if (cyw43_arch_wifi_connect_timeout_ms(
            WIFI_SSID, WIFI_PASSWORD,
            CYW43_AUTH_WPA2_AES_PSK, 30000)) {
        panic("Falha no Wi-Fi");
    }

    printf("Wi-Fi conectado\n");

    // Resolve DNS do broker MQTT
    cyw43_arch_lwip_begin();
    int err = dns_gethostbyname(MQTT_SERVER,
                               &state.mqtt_server_address,
                               dns_found, &state);
    cyw43_arch_lwip_end();

    if (err == ERR_OK) start_client(&state);
    else if (err != ERR_INPROGRESS) panic("Erro DNS");

    // Super loop
    while (true) {
        cyw43_arch_poll();

        // Executa inferência apenas quando comando e imagem estão prontos
        if (flag_rodar_inferencia && flag_nova_imagem) {
            printf("Executando inferência...\n");

            // Normaliza e quantiza a imagem
            for (int i = 0; i < IMAGE_SIZE; i++) {
                float val = image_buffer[i] / 255.0f;
                in[i] = quantize_f32_to_i8(val, in_scale, in_zp);
            }

            // Executa modelo
            if (tflm_invoke() == 0) {
                int pred = argmax_i8(out, 10);
                int8_t raw = out[pred];
                float conf = (raw - out_zp) * out_scale;

                // Cria mensagem JSON
                char msg[64];
                snprintf(msg, sizeof(msg),
                         "{\"classe\":%d,\"conf\":%.2f}",
                         pred, conf);

                // Publica resultado
                mqtt_publish(state.mqtt_client_inst,
                             full_topic(TOPIC_RES_SUFFIX),
                             msg, strlen(msg),
                             0, 0,
                             pub_request_cb, &state);

                printf("Predição: %d (%.2f)\n", pred, conf);
            }

            // Reseta flags
            flag_rodar_inferencia = false;
            flag_nova_imagem = false;
        }

        sleep_ms(10);
    }
}

// ======================================================
// IMPLEMENTAÇÃO MQTT
// ======================================================

// Retorna o tópico final (aqui usamos exatamente o nome definido)
static const char *full_topic(const char *name) {
    return name;
}

// Callback de publicação
static void pub_request_cb(void *arg, err_t err) {
    if (err != ERR_OK) printf("Erro ao publicar: %d\n", err);
}

// Callback quando um publish chega (captura o tópico)
static void mqtt_incoming_publish_cb(void *arg,
                                     const char *topic,
                                     u32_t tot_len) {
    MQTT_CLIENT_DATA_T* state = arg;
    strncpy(state->topic, topic, sizeof(state->topic));
    state->topic[sizeof(state->topic)-1] = 0;

    // Nova imagem → reseta buffer
    if (strstr(topic, TOPIC_IMG_SUFFIX)) {
        bytes_rec_count = 0;
        flag_nova_imagem = false;
    }
}

// Callback quando os dados chegam (payload)
static void mqtt_incoming_data_cb(void *arg,
                                  const u8_t *data,
                                  u16_t len,
                                  u8_t flags) {
    MQTT_CLIENT_DATA_T* state = arg;

    // Recepção da imagem
    if (strstr(state->topic, TOPIC_IMG_SUFFIX)) {
        if (bytes_rec_count + len <= IMAGE_SIZE) {
            memcpy(&image_buffer[bytes_rec_count], data, len);
            bytes_rec_count += len;
        }

        // Último fragmento
        if (flags & MQTT_DATA_FLAG_LAST) {
            if (bytes_rec_count == IMAGE_SIZE) {
                printf("Imagem recebida completa\n");
                flag_nova_imagem = true;
            }
        }
    }
    // Comando de inferência
    else if (strstr(state->topic, TOPIC_CMD_SUFFIX)) {
        flag_rodar_inferencia = true;
        printf("Comando RODAR recebido\n");
    }
}

// Callback de conexão MQTT
static void mqtt_connection_cb(mqtt_client_t *client,
                               void *arg,
                               mqtt_connection_status_t status) {
    MQTT_CLIENT_DATA_T* state = arg;

    if (status == MQTT_CONNECT_ACCEPTED) {
        printf("MQTT conectado\n");

        // Registra callbacks
        mqtt_set_inpub_callback(client,
                                mqtt_incoming_publish_cb,
                                mqtt_incoming_data_cb,
                                state);

        // Assina tópicos
        mqtt_subscribe(client, full_topic(TOPIC_IMG_SUFFIX), 1, NULL, NULL);
        mqtt_subscribe(client, full_topic(TOPIC_CMD_SUFFIX), 1, NULL, NULL);

        state->connect_done = true;
    } else {
        printf("Erro MQTT: %d\n", status);
    }
}

// Inicia o cliente MQTT
static void start_client(MQTT_CLIENT_DATA_T *state) {
    state->mqtt_client_inst = mqtt_client_new();
    if (!state->mqtt_client_inst) panic("Erro MQTT alloc");

    cyw43_arch_lwip_begin();
    err_t err = mqtt_client_connect(state->mqtt_client_inst,
                                    &state->mqtt_server_address,
                                    MQTT_PORT,
                                    mqtt_connection_cb,
                                    state,
                                    &state->mqtt_client_info);
    cyw43_arch_lwip_end();

    if (err != ERR_OK) printf("Erro chamada connect: %d\n", err);
}

// Callback DNS
static void dns_found(const char *hostname,
                      const ip_addr_t *ipaddr,
                      void *arg) {
    MQTT_CLIENT_DATA_T *state = arg;
    if (ipaddr) {
        state->mqtt_server_address = *ipaddr;
        start_client(state);
    } else {
        printf("Erro DNS\n");
    }
}
