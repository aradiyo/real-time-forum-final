package utils

import (
	"net/http"
	"time"
)

// CreateSession creates a session cookie for the user.
func CreateSession(w http.ResponseWriter, userID string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session-token",
		Value:    userID,
		Expires:  time.Now().Add(24 * time.Hour), // Session valid for 24 hours.
		HttpOnly: true,
		Path:     "/",
	})
}

// GetSession retrieves the session token (user id) from the cookie.
func GetSession(r *http.Request) (string, error) {
	cookie, err := r.Cookie("session-token")
	if err != nil {
		return "", err
	}
	return cookie.Value, nil
}

// DestroySession clears the session cookie.
func DestroySession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session-token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour), // Expire immediately.
		HttpOnly: true,
		Path:     "/",
	})
}

// AuthMiddleware ensures that the user is authenticated before accessing a route.
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
