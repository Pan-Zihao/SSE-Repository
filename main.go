package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/go-sql-driver/mysql"
	"github.com/henomis/lingoose/assistant"
	embedder "github.com/henomis/lingoose/embedder/ollama"
	"github.com/henomis/lingoose/index"
	"github.com/henomis/lingoose/index/vectordb/jsondb"
	"github.com/henomis/lingoose/llm/ollama"
	"github.com/henomis/lingoose/rag"
	"github.com/henomis/lingoose/thread"
)

var db *sql.DB
var File_dir string = "/Users/jiangjiaying/Programs/Assistant/files"
var DB_dir string = "/Users/jiangjiaying/Programs/Assistant/vector_db"
var err error

// 定义数据库记录结构
type DBInfo struct {
	Username       string `json:"username"`
	CreateTime     string `json:"create_time"`
	EmbeddingModel string `json:"embedding_model"`
	FileName       string `json:"file_name"`
	DBName         string `json:"db_name"`
}

// 定义数据库记录结构
type Conversation struct {
	Username       string `json:"username"`
	CreateTime     string `json:"create_time"`
	Input          string `json:"input"`
	Output         string `json:"output"`
	LLM            string `json:"llm"`
	EmbeddingModel string `json:"embedding_model"`
	FileName       string `json:"file_name"`
	DBName         string `json:"db_name"`
}

func init() {
	var err error
	// 替换为你的MySQL数据库连接信息
	dsn := "root:pzh040723@tcp(127.0.0.1:3306)/SSE_RAG"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to MySQL: %v", err)
	}

	// 测试数据库连接
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to MySQL successfully.")
}

func main() {
	r := gin.Default()
	r.Use(Cors())
	r.POST("/login", LoginHandler)
	r.POST("/register", RegisterHandler)
	r.POST("/upload", GetFileHandler)
	r.POST("/chat", QAhandler)
	r.POST("/info", InfoHandler)
	r.POST("/db", DBHandler)
	r.POST("/history", HistoryHandler)

	// 启动服务
	if err := r.Run(":80"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
	/*
		r := CreateRAG("test.json", "/Users/jiangjiaying/Programs/Assistant/Conditional Image Synthesis with Diffusion Models.pdf", "nomic-embed-text:latest")
		result := CreateAssistant("what is diffusion model?", r, "qwen2.5:0.5b")
		fmt.Println(result)
	*/
}

// 登录接口
func LoginHandler(c *gin.Context) {
	var request struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var storedPassword string
	err := db.QueryRow("SELECT password FROM users WHERE username = ?", request.Username).Scan(&storedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "User not found"})
			fmt.Println(err.Error())
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Database error"})
			fmt.Println(err.Error())
		}
		return
	}

	if storedPassword != request.Password {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid password"})
		return
	}

	_, err = db.Exec("UPDATE users SET last_login = NOW() WHERE username = ?", request.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to update login time"})
		fmt.Println(err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Login successful"})
}

func Cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", "*") // 可将将 * 替换为指定的域名
			c.Header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, UPDATE")
			c.Header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")
			c.Header("Access-Control-Expose-Headers", "Content-Length, Access-Control-Allow-Origin, Access-Control-Allow-Headers, Cache-Control, Content-Language, Content-Type")
			c.Header("Access-Control-Allow-Credentials", "true")
		}
		if method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
		}
		c.Next()
	}
}

// 注册接口
func RegisterHandler(c *gin.Context) {
	var request struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		fmt.Println(err.Error())
		return
	}

	if len(request.Username) < 3 || len(request.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username must be at least 3 characters and password at least 6 characters"})
		fmt.Println(err.Error())
		return
	}

	_, err := db.Exec("INSERT INTO users (username, password, last_login) VALUES (?, ?, NOW())", request.Username, request.Password)
	if err != nil {
		if mysqlErr, ok := err.(*mysql.MySQLError); ok && mysqlErr.Number == 1062 {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username already exists"})
			fmt.Println(err.Error())
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Database error" + err.Error()})
			fmt.Println(err.Error())
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Registration successful"})
}

func GetFileHandler(c *gin.Context) {
	// 获取用户名、时间、模型名字信息
	username := c.PostForm("username")
	modelName := c.PostForm("model_name")
	embeddingModel := c.PostForm("embedding_model")

	// 检查参数是否完整
	if username == "" || modelName == "" || embeddingModel == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields: username, model_name, or embedding_model."})
		return
	}

	// 获取文件信息
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file: " + err.Error()})
		fmt.Println("Failed to get file: " + err.Error())
		return
	}

	// 构建文件夹路径
	folderPath := filepath.Join(File_dir, username, modelName)
	dbFolderPath := filepath.Join(DB_dir, username, modelName)
	if err := os.MkdirAll(folderPath, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory: " + err.Error()})
		fmt.Println("Failed to create directory: " + err.Error())
		return
	}

	if err := os.MkdirAll(dbFolderPath, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory: " + err.Error()})
		fmt.Println("Failed to create directory: " + err.Error())
		return
	}

	// 保存文件到目标文件夹
	filePath := filepath.Join(folderPath, file.Filename)
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file: " + err.Error()})
		fmt.Println("Failed to save file: " + err.Error())
		return
	}

	name := file.Filename
	fmt.Println(name)
	ext := filepath.Ext(name)
	fmt.Println(ext)
	name = name[:len(name)-len(ext)]
	fmt.Println(name)
	// 构建数据库路径
	dbPath := filepath.Join(dbFolderPath, name+".json")
	fmt.Println(dbPath)
	fmt.Println(filePath)
	fmt.Println(embeddingModel)
	_ = CreateRAG(dbPath, filePath, embeddingModel)

	_, err = db.Exec("insert into db_info (username, create_time, embedding_model, file_name, db_name) values (?,NOW(),?,?,?)", username, embeddingModel, filePath, dbPath)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save db_info: " + err.Error()})
		fmt.Println("Failed to save db_info: " + err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "File uploaded and RAG created successfully!",
		"file_path": filePath,
		"db_path":   dbPath,
	})
}

func QAhandler(c *gin.Context) {
	userInput := c.PostForm("userinput")
	model := c.PostForm("model")
	username := c.PostForm("username")
	filename := c.PostForm("filename")
	dbname := c.PostForm("dbname")
	embeddingModel := c.PostForm("embedding_model")

	// 检查参数完整性
	if userInput == "" || model == "" || username == "" || filename == "" || dbname == "" || embeddingModel == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing required fields: userinput, model, username, or filename",
		})
		return
	}

	r := CreateRAG(dbname, filename, embeddingModel)
	result := CreateAssistant(userInput, r, model)

	_, err := db.Exec("INSERT into conversation (username, create_time, input, output, llm, embedding_model, file_name, db_name) values (?,NOW(),?,?,?,?,?,?)", username, userInput, result, model, embeddingModel, filename, dbname)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message: " + err.Error()})
		fmt.Println(err.Error())
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":         "llm responses successfully!",
		"input":           userInput,
		"output":          result,
		"model":           model,
		"embedding_model": embeddingModel,
	})
}

func CreateAssistant(input string, r *rag.RAG, model string) string {
	a := assistant.New(
		ollama.New().WithEndpoint("http://localhost:11434/api").WithModel(model),
	).WithParameters(
		assistant.Parameters{
			AssistantName:     "AI Pirate Assistant",
			AssistantIdentity: "a pirate and helpful assistant",
			AssistantScope:    "with their questions replying as a pirate",
		},
	).WithRAG(r).WithThread(
		thread.New().AddMessages(
			thread.NewUserMessage().AddContent(
				thread.NewTextContent(input),
			),
		),
	)
	err := a.Run(context.Background())
	if err != nil {
		panic(err)
	}
	for _, message := range a.Thread().Messages {
		if string(message.Role) == "assistant" {
			for _, content := range message.Contents {
				return content.Data.(string)
			}
		}
	}
	return ""
}

// 创建一个新的RAG，输入向量化后的数据json地址、源文件地址、选择的embedding model，返回一个rag对象
func CreateRAG(db_path string, file_path string, embedding_model string) *rag.RAG {
	r := rag.New(
		index.New(
			jsondb.New().WithPersist(db_path),
			embedder.New().WithEndpoint("http://localhost:11434/api").WithModel(embedding_model),
		),
	).WithTopK(3)

	_, err := os.Stat(db_path)

	if os.IsNotExist(err) {
		err = r.AddSources(context.Background(), file_path)
		if err != nil {
			panic(err)
		}
	}
	return r
}

// 定义 /info 路由的处理函数
func InfoHandler(c *gin.Context) {
	// 成功返回模型列表
	c.JSON(http.StatusOK, gin.H{
		"llm_models":       []string{"qwen2.5:0.5b", "llama3.2:1b"},
		"embedding_models": []string{"nomic-embed-text:latest", "mxbai-embed-large"},
	})
}

// 查询数据库信息
func queryDBInfo(db *sql.DB, username string) ([]DBInfo, error) {
	query := `SELECT username, create_time, embedding_model, file_name, db_name 
			  FROM db_info 
			  WHERE username = ?`

	rows, err := db.Query(query, username)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []DBInfo
	for rows.Next() {
		var info DBInfo
		err := rows.Scan(&info.Username, &info.CreateTime, &info.EmbeddingModel, &info.FileName, &info.DBName)
		if err != nil {
			return nil, err
		}
		results = append(results, info)
	}

	return results, nil
}

// 定义 /db 路由的处理函数
func DBHandler(c *gin.Context) {
	// 获取客户端传递的 username 参数
	username := c.PostForm("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to connect to database: %v", err)})
		fmt.Println(err.Error())
		return
	}
	defer db.Close()

	// 查询数据库信息
	records, err := queryDBInfo(db, username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to query database: %v", err)})
		fmt.Println(err.Error())
		return
	}

	// 如果没有记录，返回空数组
	if len(records) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No records found", "data": []DBInfo{}})
		return
	}

	// 成功返回查询结果
	c.JSON(http.StatusOK, gin.H{"message": "Query successful", "data": records})
}

// 修改后的查询函数，按用户名返回所有记录
func queryConversationsByUsername(db *sql.DB, username string) ([]Conversation, error) {
	query := `SELECT username, create_time, input, output, llm, embedding_model, file_name, db_name 
			  FROM conversation 
			  WHERE username = ?`

	rows, err := db.Query(query, username)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []Conversation
	for rows.Next() {
		var convo Conversation
		err := rows.Scan(&convo.Username, &convo.CreateTime, &convo.Input, &convo.Output, &convo.LLM, &convo.EmbeddingModel, &convo.FileName, &convo.DBName)
		if err != nil {
			return nil, err
		}
		results = append(results, convo)
	}

	return results, nil
}

// 修改后的 /history 路由处理函数
func HistoryHandler(c *gin.Context) {
	// 获取客户端传递的参数
	username := c.PostForm("username")

	// 检查必要参数是否完整
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required field: username."})
		return
	}

	// 查询数据库信息
	records, err := queryConversationsByUsername(db, username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to query database: %v", err)})
		fmt.Println(err.Error())
		return
	}

	// 如果没有记录，返回空数组
	if len(records) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No records found", "data": []Conversation{}})
		return
	}

	// 成功返回查询结果
	c.JSON(http.StatusOK, gin.H{"message": "Query successful", "data": records})
}
