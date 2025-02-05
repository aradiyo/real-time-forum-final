package utils

import (
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/gofrs/uuid"
)

// sessions maps session tokens to user IDs.
var (
	sessions   = make(map[string]string)
	sessMutex  = &sync.RWMutex{}
	cookieName = "session-token"
)

// CreateSession creates a session for the user and sets a cookie.
func CreateSession(w http.ResponseWriter, userID string) {
	// Generate a new session token.
	token := uuid.Must(uuid.NewV4()).String()

	// Store the token in the sessions map.
	sessMutex.Lock()
	sessions[token] = userID
	sessMutex.Unlock()

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Expires:  time.Now().Add(24 * time.Hour), // Session valid for 24 hours.
		HttpOnly: true,
		Path:     "/",
	})
}

// GetSession retrieves the user ID from the session cookie.
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

// DestroySession removes the session token and clears the cookie.
func DestroySession(w http.ResponseWriter, r *http.Request) {
	// Try to get the existing session cookie.
	cookie, err := r.Cookie(cookieName)
	if err == nil {
		token := cookie.Value
		sessMutex.Lock()
		delete(sessions, token)
		sessMutex.Unlock()
	}
	// Set the cookie to expire.
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour), // Expire immediately.
		HttpOnly: true,
		Path:     "/",
	})
}

// AuthMiddleware ensures the user is authenticated.
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
