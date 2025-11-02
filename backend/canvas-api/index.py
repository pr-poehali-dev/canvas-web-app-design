'''
Business: Canvas API для сохранения и загрузки проектов с объектами
Args: event - dict с httpMethod, body, queryStringParameters
      context - object с request_id, function_name
Returns: HTTP response dict
'''
import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            project_id = params.get('project_id')
            
            if project_id:
                cur.execute(
                    "SELECT * FROM canvas_objects WHERE project_id = %s ORDER BY created_at",
                    (int(project_id),)
                )
                objects = cur.fetchall()
                
                cur.execute(
                    "SELECT * FROM canvas_projects WHERE id = %s",
                    (int(project_id),)
                )
                project = cur.fetchone()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'project': dict(project) if project else None, 'objects': [dict(o) for o in objects]}),
                    'isBase64Encoded': False
                }
            else:
                cur.execute("SELECT * FROM canvas_projects ORDER BY updated_at DESC")
                projects = cur.fetchall()
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'projects': [dict(p) for p in projects]}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'create_project':
                name = body_data.get('name', 'Untitled Project')
                description = body_data.get('description', '')
                
                cur.execute(
                    "INSERT INTO canvas_projects (name, description) VALUES (%s, %s) RETURNING id",
                    (name, description)
                )
                project_id = cur.fetchone()['id']
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'project_id': project_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'save_objects':
                project_id = body_data.get('project_id')
                objects = body_data.get('objects', [])
                
                cur.execute("DELETE FROM canvas_objects WHERE project_id = %s", (project_id,))
                
                for obj in objects:
                    cur.execute(
                        """INSERT INTO canvas_objects 
                        (project_id, object_id, type, x, y, width, height, text, color) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (project_id, obj['id'], obj['type'], obj['x'], obj['y'], 
                         obj.get('width'), obj.get('height'), obj.get('text'), obj['color'])
                    )
                
                cur.execute(
                    "UPDATE canvas_projects SET updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (project_id,)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
