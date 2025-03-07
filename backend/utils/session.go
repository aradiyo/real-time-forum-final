package utils

import (
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/gofrs/uuid"
)

var (
	sessions   = make(map[string]string)
	sessMutex  = &sync.RWMutex{}
	cookieName = "session-token"
)

func CreateSession(w http.ResponseWriter, userID string) {
	token := uuid.Must(uuid.NewV4()).String()

	sessMutex.Lock()
	sessions[token] = userID
	sessMutex.Unlock()

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Path:     "/",
	})
}

func GetSession(r *http.Request) (string, error) {
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return "", err
	}
	token := cookie.Value
	sessMutex.RLock()
	userID, ok := sessions[token]
	sessMutex.RUnlock()
	if !ok {
		return "", errors.New("session not found")
	}
	return userID, nil
}

func DestroySession(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(cookieName)
	if err == nil {
		token := cookie.Value
		sessMutex.Lock()
		delete(sessions, token)
		sessMutex.Unlock()
	}
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Path:     "/",
	})
}

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionToken, err := GetSession(r)
		if err != nil || sessionToken == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}
