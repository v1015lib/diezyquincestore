import os
from PIL import Image
import argparse
import sys
import time # Se importa la librería 'time' para generar nombres únicos

try:
    from rembg import remove
except ImportError:
    print("Error: La librería 'rembg' no está instalada. Por favor, instálala con: pip install rembg")
    exit()

# --- CONFIGURACIÓN ---
try:
    script_dir = os.path.dirname(os.path.abspath(__file__))
except NameError:
    script_dir = os.getcwd()

carpeta_entrada = os.path.join(script_dir, 'entrada')
carpeta_salida = os.path.join(script_dir, 'salida_ia')
tamaño_final = (500, 500)
padding_porcentaje = 0
extensiones_validas = ('.png', '.jpg', '.jpeg', '.webp')

# --- LÓGICA DE ARGUMENTOS (sin cambios) ---
parser = argparse.ArgumentParser(description="Procesa imágenes con opción de rotación.")
parser.add_argument('--rotate', type=str, choices=['left', 'right'], help='Rotar la imagen.')
args = parser.parse_args()
rotation = args.rotate

print("--- INICIO DE DIAGNÓSTICO ---")
print(f"Línea de comando completa recibida: {' '.join(sys.argv)}")
print(f"Opción de rotación detectada por Python: {rotation}")
print("-----------------------------")

# --- LÓGICA DEL SCRIPT ---
if not os.path.exists(carpeta_salida):
    os.makedirs(carpeta_salida)

try:
    if not os.path.exists(carpeta_entrada):
        print(f"ERROR CRITICO: No se pudo encontrar la carpeta 'entrada' en: {os.path.abspath(carpeta_entrada)}")
        exit()
    archivos = os.listdir(carpeta_entrada)
except Exception as e:
    print(f"ERROR al leer la carpeta de entrada: {e}")
    exit()

if not archivos:
    print("AVISO: La carpeta 'entrada' está vacía.")
    exit()

print(f"Iniciando proceso para {len(archivos)} archivos encontrados...")
contador = 0

for nombre_archivo in archivos:
    if nombre_archivo.lower().endswith(extensiones_validas):
        try:
            print(f"Procesando: {nombre_archivo}...")
            
            # --- MEJORA: NOMBRE DE ARCHIVO ÚNICO ---
            nombre_base = os.path.splitext(nombre_archivo)[0]
            timestamp = int(time.time()) # Se obtiene un número único basado en la hora
            # Se crea el nuevo nombre con el timestamp para evitar problemas de caché
            nuevo_nombre_jpg = f"{nombre_base}_{timestamp}.jpg" 
            # --- FIN DE LA MEJORA ---

            ruta_entrada = os.path.join(carpeta_entrada, nombre_archivo)
            ruta_salida = os.path.join(carpeta_salida, nuevo_nombre_jpg)
            
            with Image.open(ruta_entrada) as img_original:
                # ... (El resto del procesamiento de la imagen no cambia)
                img_sin_fondo = remove(img_original)
                fondo_blanco = Image.new("RGBA", tamaño_final, (255, 255, 255, 255))
                ancho_maximo = int(tamaño_final[0] * (1 - padding_porcentaje))
                alto_maximo = int(tamaño_final[1] * (1 - padding_porcentaje))
                tamaño_con_padding = (ancho_maximo, alto_maximo)
                img_sin_fondo.thumbnail(tamaño_con_padding, Image.Resampling.LANCZOS)
                pos_x = (tamaño_final[0] - img_sin_fondo.width) // 2
                pos_y = (tamaño_final[1] - img_sin_fondo.height) // 2
                fondo_blanco.paste(img_sin_fondo, (pos_x, pos_y), img_sin_fondo)
                imagen_rgb = fondo_blanco.convert("RGB")

                if rotation == 'left':
                    imagen_final = imagen_rgb.rotate(90, expand=True)
                elif rotation == 'right':
                    imagen_final = imagen_rgb.rotate(-90, expand=True)
                else:
                    imagen_final = imagen_rgb

                imagen_final.save(ruta_salida, quality=95)
                print(f"-> ¡Éxito! Guardado como '{nuevo_nombre_jpg}'")
                contador += 1
        except Exception as e:
            print(f"-> ERROR procesando {nombre_archivo}: {e}")

print(f"\n--- ¡Proceso con IA completado! ---")
print(f"Total de imágenes procesadas: {contador}")