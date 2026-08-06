package logger

import (
	"bytes"
	"io"
	"os"
	"sync"
)

var (
	GlobalLogBuffer *LogBuffer
)

func init() {
	GlobalLogBuffer = NewLogBuffer(100)
}

type LogBuffer struct {
	mu        sync.Mutex
	listeners map[chan string]bool
	Stdout    io.Writer
}

func NewLogBuffer(size int) *LogBuffer {
	return &LogBuffer{
		listeners: make(map[chan string]bool),
		Stdout:    os.Stdout,
	}
}

// Write implementa io.Writer
func (b *LogBuffer) Write(p []byte) (n int, err error) {
	// Primero escribimos a la salida estándar real
	n, err = b.Stdout.Write(p)

	// Clonamos los bytes para enviarlos a los listeners
	msg := string(bytes.TrimRight(p, "\n"))
	
	if msg != "" {
		b.mu.Lock()
		for ch := range b.listeners {
			select {
			case ch <- msg:
			default:
				// Si el canal está lleno, saltamos (no bloqueamos el hilo principal)
			}
		}
		b.mu.Unlock()
	}

	return n, err
}

func (b *LogBuffer) AddListener(ch chan string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.listeners[ch] = true
}

func (b *LogBuffer) RemoveListener(ch chan string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if _, ok := b.listeners[ch]; ok {
		delete(b.listeners, ch)
		close(ch)
	}
}
